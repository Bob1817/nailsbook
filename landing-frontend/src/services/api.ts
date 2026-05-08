const API_BASE = '/api';

export async function submitArtistApplication(data: {
  name: string;
  phone: string;
  city: string;
  serviceMode?: string;
  experience?: string;
  specialty?: string;
  note?: string;
}) {
  const response = await fetch(`${API_BASE}/artist-applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('提交失败');
  }

  return response.json();
}

export async function getFeaturedWorks() {
  const response = await fetch(`${API_BASE}/public/works/featured`);
  if (!response.ok) {
    throw new Error('获取失败');
  }
  return response.json();
}
