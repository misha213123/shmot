import { supabase } from './supabase';

const BUCKET = 'product-images';
const MAX_FILES = 10;
const MAX_FILE_SIZE = 12 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

function safeExtension(file: File): string {
  const raw = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  return raw.replace(/[^a-z0-9]/g, '') || 'jpg';
}

export async function uploadProductImages(userId: string, files: File[]): Promise<string[]> {
  if (!files.length) throw new Error('Выберите хотя бы одну фотографию');
  if (files.length > MAX_FILES) throw new Error(`Можно добавить не больше ${MAX_FILES} фотографий`);

  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) throw new Error(`Формат ${file.name} не поддерживается`);
    if (file.size > MAX_FILE_SIZE) throw new Error(`Файл ${file.name} больше 12 МБ`);
  }

  const listingId = crypto.randomUUID();
  const uploadedPaths: string[] = [];

  try {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const path = `${userId}/${listingId}/${index}-${crypto.randomUUID()}.${safeExtension(file)}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      uploadedPaths.push(path);
    }
  } catch (error) {
    if (uploadedPaths.length) await supabase.storage.from(BUCKET).remove(uploadedPaths);
    throw error;
  }

  return uploadedPaths.map((path) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
}
