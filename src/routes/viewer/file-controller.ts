import { deleteFile } from '@/lib/api/files';

export class FileController {
  public async deleteFile(path: string): Promise<void> {
    const result = await deleteFile(path);
    console.log(result);
  }
}
