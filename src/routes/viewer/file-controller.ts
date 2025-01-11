import { invoke } from "@tauri-apps/api/core";

export class FileController {
  public async deleteFile(path: string): Promise<void> {
    const result = await invoke('delete_file', { path });
    console.log(result);
  }
}
