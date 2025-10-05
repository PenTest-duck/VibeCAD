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

def is_fist_closed(hand_landmarks):
    """
    Returns True if all fingers (index, middle, ring, pinky) are folded.
    """
    return sum(fingers_up(hand_landmarks)) == 0

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
    Determines if the hand is pointing with the index and middle fingers extended.
    Returns the cardinal direction if pointing, else None.
    """
    states = fingers_up(hand_landmarks)
    # Two-finger pointing: index + middle extended, ring + pinky folded
    if states == [1, 1, 0, 0]:
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



def get_hand_orientation(hand_landmarks, prev_wrist_y=None, pitch_rotation=0, sensitivity=100):
    """
    Estimates hand orientation (pitch, yaw, roll) in degrees using MediaPipe landmarks.
    Returns (yaw, pitch, roll, updated_prev_wrist_y, updated_pitch_rotation)
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

    # Return angles and updated state
    return yaw, normalize_angle(roll+100)

# --- Added for pointing cursor ---
def draw_pointing_cursor(frame, hand_landmarks):
    """Draws a cursor in the direction between the index and middle fingers and prints normalized coordinates."""
    h, w, _ = frame.shape
    index_tip = hand_landmarks.landmark[8]
    middle_tip = hand_landmarks.landmark[12]
    wrist = hand_landmarks.landmark[0]

    # Midpoint between index and middle fingertips
    tip_center = np.array([
        (index_tip.x + middle_tip.x) / 2,
        (index_tip.y + middle_tip.y) / 2
    ])

    # Direction vector from wrist to tip_center
    dir_vec = np.array([
        tip_center[0] - wrist.x,
        tip_center[1] - wrist.y
    ])
    dir_vec /= np.linalg.norm(dir_vec) + 1e-6

    # Convert to pixel coordinates
    start = np.array([tip_center[0] * w, tip_center[1] * h])
    cursor = start + dir_vec * 200  # extend forward
    cursor = np.clip(cursor, [0, 0], [w-1, h-1])
    cursor = tuple(cursor.astype(int))

    # Normalize to [0, 1]
    norm_x = round(cursor[0] / w, 2)
    norm_y = round(cursor[1] / h, 2)

    # Draw cursor and direction line
    cv2.circle(frame, cursor, 10, (0, 0, 255), -1)
    cv2.line(frame, tuple(start.astype(int)), cursor, (255, 0, 0), 2)

    # Print normalized coordinates
    return f"Pointing at (x={norm_x}, y={1-norm_y})"



# Open webcam
cap = cv2.VideoCapture(0)

with mp_hands.Hands(
    max_num_hands=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
) as hands:

    closed = False
    pitch_rotation = 0

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            break

        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(rgb)

        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                # --- PITCH based on fist vertical movement ---
                # --- Initialize once at top of script ---
                wrist = hand_landmarks.landmark[0]
                sensitivity = 360  # higher to amplify small normalized changes

                # --- Inside your loop ---

                if is_fist_closed(hand_landmarks):
                    if closed == False:
                        first_wrist_y = wrist.y  # initialize on fist close
                        prev_wrist_y = wrist.y
                    closed = True
                    current_y = wrist.y
                    dy = current_y - prev_wrist_y  # positive if moving down
                    pitch_rotation += dy * sensitivity
                    pitch_rotation = normalize_angle(pitch_rotation)
                    prev_wrist_y = current_y  # store current y for next frame
                else:
                    closed = False

                mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                gesture = detect_gesture(hand_landmarks)
                yaw, roll = get_hand_orientation(hand_landmarks)


                if detect_pointing_gesture(hand_landmarks):
                    display_text = draw_pointing_cursor(frame, hand_landmarks)
                elif gesture != "UNKNOWN":
                    display_text = f"Gesture: {gesture}"
                elif is_fist_closed(hand_landmarks):
                    display_text = f"Pitch: {pitch_rotation:.1f} degrees, Yaw: {yaw:.1f} degrees, Roll: {roll:.1f} degrees"
                else:
                    display_text = "Gesture: NONE"


                cv2.putText(frame, display_text, (50, 100),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 1)

        cv2.imshow("Hand Gesture Recognition", frame)
        if cv2.waitKey(5) & 0xFF == 27:
            break

cap.release()
cv2.destroyAllWindows()
