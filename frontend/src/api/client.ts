// This returns the CAD model ID
export const generateCAD = async (image: File): Promise<string> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/generate`, {
    method: "POST",
    body: image,
  });
  if (!response.ok) {
    throw new Error("Failed to generate CAD");
  }

  const result = await response.json();
  return result["model_id"];
};

export const editCAD = async (modelID: string, prompt: string): Promise<void> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/edit`, {
    method: "POST",
    body: JSON.stringify({ model_id: modelID, prompt }),
  });
  if (!response.ok) {
    throw new Error("Failed to edit CAD");
  }
};
