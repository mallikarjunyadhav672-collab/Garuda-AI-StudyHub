from pathlib import Path
path = Path(r'C:\Garuda\garuda-studyhub-complete\garuda-studyhub\frontend\src\lib\api.ts')
lines = path.read_text('utf-8').splitlines()
# Fix request interceptor header assignment
lines[36] = '    if (!config.headers) config.headers = {} as any;'
bt = chr(96)
lines[37] = f'    (config.headers as any).Authorization = {bt}Bearer ${{token}}{bt};'
# Fix response interceptor header assignment
lines[62] = f'        original.headers.Authorization = {bt}Bearer ${{token}}{bt};'
path.write_text('\n'.join(lines) + '\n', 'utf-8')
print('patched')
