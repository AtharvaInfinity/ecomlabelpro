import type { MeeshoProcessOptions, MeeshoProcessResult } from '../types/meesho'

export async function processMeeshoPdfs(
  files: Array<{ fileId: string; fileName: string; pages: number }>,
  options: MeeshoProcessOptions,
): Promise<MeeshoProcessResult> {
  const response = await fetch('/api/meesho/process', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ files, options }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.message || 'Meesho processing failed.')
  }

  return data as MeeshoProcessResult
}
