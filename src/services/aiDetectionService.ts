interface DetectionPayload {
  content: string;
  postId: string;
  postTable: 'posts' | 'post_series';
}

export async function requestAiDetection(payload: DetectionPayload): Promise<void> {
  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/detect-ai-content`;

    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        if (!response.ok) {
          console.error('AI Detection failed:', response.status, response.statusText);
          const text = await response.text();
          console.error('Response:', text);
        } else {
          const result = await response.json();
          console.log('AI Detection result:', result);
        }
      })
      .catch((error) => {
        console.error('AI Detection request failed:', error);
      });
  } catch (error) {
    console.error('AI Detection error:', error);
  }
}
