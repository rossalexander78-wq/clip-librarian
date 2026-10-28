"""Builds index.html (the standalone app) from src/: the page template, the file-editing code and the demo set."""
import pathlib
here = pathlib.Path(__file__).parent
page = (here / 'src/page.html').read_text()
rows = (here / 'src/rows.js').read_text()
demo = (here / 'src/demo.json').read_text().replace('</', '<\\/')
body = page.replace('__SAMPLE__', demo).replace('__ROWSJS__', rows)
html = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '</head>\n<body>\n' + body + '\n</body>\n</html>\n')
(here / 'index.html').write_text(html)
print('index.html', len(html), 'bytes')
