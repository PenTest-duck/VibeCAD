import cv2
import mediapipe as mp
import math
import numpy as np

# Initialize MediaPipe Hands
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

def distance(p1, p2):
    return math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2)

def is_finger_extended(tip, pip, mcp, threshold=0.7):
    """
    Determines if a finger is extended based on the cosine of the angle
    between MCP→PIP and PIP→TIP.
    Returns True if the finger is mostly straight.
    """
    # Vectors
    v1 = [pip.x - mcp.x, pip.y - mcp.y]
    v2 = [tip.x - pip.x, tip.y - pip.y]

    # Compute cosine similarity
    dot = v1[0]*v2[0] + v1[1]*v2[1]
    norm1 = math.sqrt(v1[0]**2 + v1[1]**2)
    norm2 = math.sqrt(v2[0]**2 + v2[1]**2)

    cos_angle = dot / (norm1 * norm2 + 1e-6)  # avoid div by zero

    return cos_angle > threshold  # >0.7 means finger is mostly straight

def fingers_up(hand_landmarks):
    """
    Returns a list of finger states [index, middle, ring, pinky] using vector method.
    1 = extended, 0 = folded.
    """
    tips = [8, 12, 16, 20]
    pips = [6, 10, 14, 18]
    mcps = [5, 9, 13, 17]
    states = []
    for tip_id, pip_id, mcp_id in zip(tips, pips, mcps):
        tip = hand_landmarks.landmark[tip_id]
        pip = hand_landmarks.landmark[pip_id]
        mcp = hand_landmarks.landmark[mcp_id]
        states.append(1 if is_finger_extended(tip, pip, mcp) else 0)
    return states

def detect_direction(hand_landmarks):
    """
    Returns one of 'UP', 'DOWN', 'LEFT', 'RIGHT' based on
    the vector from wrist to index fingertip.
    Fully covers 360° with no gaps.
    """
    wrist = hand_landmarks.landmark[0]
    index_tip = hand_landmarks.landmark[8]

    dx = index_tip.x - wrist.x
    dy = wrist.y - index_tip.y  # Invert y for natural coordinate system (y grows downward)

    angle = math.degrees(math.atan2(dy, dx))  # Angle in degrees (-180 to 180)

    # Cardinal directions with explicit ranges
    if 45 <= angle <= 135:
        return "UP"
    elif -135 <= angle <= -45:
        return "DOWN"
    elif -45 < angle < 45:
        return "RIGHT"
    else:  # Covers 135 → 180 and -180 → -135
        return "LEFT"

def detect_pointing_gesture(hand_landmarks):
    """
    Determines if the hand is pointing with the index finger and
    returns the cardinal direction. Returns None if not pointing.
    """
    states = fingers_up(hand_landmarks)
    if states == [1, 0, 0, 0]:  # Only index finger extended
        return detect_direction(hand_landmarks)
    else:
        return None

def detect_gesture(hand_landmarks):
    states = fingers_up(hand_landmarks)
    thumb_tip = hand_landmarks.landmark[4]
    index_tip = hand_landmarks.landmark[8]
    pinch_distance = distance(thumb_tip, index_tip)

    # High Five → Zoom Out
    if states == [1, 1, 1, 1]:
        return "ZOOM OUT"
    # Pinch → Zoom In
    elif pinch_distance < 0.05:
        return "ZOOM IN"
    # Index finger pointing → detect direction
    elif states == [1, 0, 0, 0]:
        return detect_direction(hand_landmarks)
    else:
        return "UNKNOWN"

def normalize_angle(angle):
    """
    Normalize any angle (degrees) to the range (-180, 180].
    """
    return (angle + 180) % 360 - 180



def get_hand_orientation(hand_landmarks):
    """
    Estimates hand orientation (pitch, yaw, roll) in degrees using MediaPipe landmarks.
    Returns (pitch, yaw, roll) or (None, None, None) if invalid.
    """

    # Key landmarks for palm plane
    wrist = hand_landmarks.landmark[0]
    index_mcp = hand_landmarks.landmark[5]
    pinky_mcp = hand_landmarks.landmark[17]
    middle_mcp = hand_landmarks.landmark[9]

    # Convert to numpy arrays (3D coordinates)
    w = np.array([wrist.x, wrist.y, wrist.z])
    i = np.array([index_mcp.x, index_mcp.y, index_mcp.z])
    p = np.array([pinky_mcp.x, pinky_mcp.y, pinky_mcp.z])
    m = np.array([middle_mcp.x, middle_mcp.y, middle_mcp.z])

    # Palm plane normal vector
    v1 = i - w
    v2 = p - w
    normal = np.cross(v1, v2)
    normal /= np.linalg.norm(normal) + 1e-6

    # Palm forward vector (wrist → middle finger)
    forward = m - w
    forward /= np.linalg.norm(forward) + 1e-6

    # Compute orientation angles
    yaw   = math.degrees(math.atan2(normal[0], normal[2]))  # left/right rotation
    roll  = math.degrees(math.atan2(forward[1], forward[0]))  # twist

    return yaw, normalize_angle(roll+100)


# Open webcam
cap = cv2.VideoCapture(0)

with mp_hands.Hands(
    max_num_hands=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
) as hands:

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            break

        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(rgb)

        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                gesture = detect_gesture(hand_landmarks)
                yaw, roll = get_hand_orientation(hand_landmarks)


                if gesture != "UNKNOWN":
                    display_text = f"Gesture: {gesture}"
                else:
                    display_text = f"Yaw: {yaw:.1f} degrees, Roll: {roll:.1f} degrees"


                cv2.putText(frame, display_text, (50, 100),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

        cv2.imshow("Hand Gesture Recognition", frame)
        if cv2.waitKey(5) & 0xFF == 27:
            break

cap.release()
cv2.destroyAllWindows()
