import html2canvas from 'html2canvas';

export async function generateHandHistoryImage(previewElement: HTMLElement): Promise<string> {
  try {
    const canvas = await html2canvas(previewElement, {
      backgroundColor: '#111827', // matches bg-gray-900
      scale: 2, // Higher resolution
      logging: false,
      useCORS: true
    });

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
} 