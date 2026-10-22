#!/usr/bin/env python3
"""Wandelt eine eigenstaendige Lernmodul-HTML-Datei in einen ByCS-Einbettungsschnipsel um.
Aufruf: python3 build_embed.py quelle.html ausgabe-einbetten.html [mount-id]
Konventionen der Quelle: ein <style>, ein <script> am Ende von <body>; im Skript `var ROOT = document;`
und alle DOM-Zugriffe ueber ROOT; Dunkelmodus zwischen /*@dark*/ und /*@end*/; Druck-CSS zwischen /*@print*/ und /*@end*/."""
import re, sys, json, base64
src, out = sys.argv[1], sys.argv[2]
mount = sys.argv[3] if len(sys.argv) > 3 else 'lernmodul-app'
s = open(src, encoding='utf-8').read()
css = re.search(r'<style>(.*?)</style>', s, re.S).group(1)
body = re.search(r'<body[^>]*>\s*(.*?)\s*<script>', s, re.S).group(1)
js = re.search(r'<script>(.*?)</script>\s*</body>', s, re.S).group(1)

css = re.sub(r'/\*@dark\*/.*?/\*@end\*/', '', css, flags=re.S)
css = re.sub(r'/\*@print\*/.*?/\*@end\*/', '', css, flags=re.S)
css = css.replace(':root{', ':host{')
m = re.search(r'html,\s*body\s*\{([^}]*)\}', css)
assert m, 'Regel html,body{...} fehlt'
css = css.replace(m.group(0), '')
css = re.sub(r'@media \((max|min)-width:', r'@container (\1-width:', css)
host = (':host{all:initial;display:block;' + m.group(1).replace('margin:0;', '') + '}\n'
        '.app{background:var(--bg);border-radius:16px;container-type:inline-size;text-align:left}\n'
        'svg{vertical-align:baseline}\n')
css = host + css
assert not re.search(r'(^|[\s,}])(html|body)\s*[{,]', css), 'html/body-Selektor uebrig'

n = js.count('var ROOT = document;')
assert n == 1, 'Genau eine Zeile "var ROOT = document;" erwartet'
js = js.replace('var ROOT = document;', '')
for bad in ['document.querySelector', 'document.getElementById', 'document.elementFromPoint', 'DOMContentLoaded']:
    assert bad not in js, 'Verboten im Skript: ' + bad + ' (stattdessen ROOT verwenden)'

loader = ("(function(){\n"
  "var HOST=document.getElementById(%s);\n"
  "if(!HOST){HOST=document.createElement('div');HOST.id=%s;var me=document.currentScript;me.parentNode.insertBefore(HOST,me);}\n"
  "if(HOST.shadowRoot||HOST.getAttribute('data-loaded'))return;HOST.setAttribute('data-loaded','1');\n"
  "var ROOT=HOST.attachShadow({mode:'open'});\n"
  "ROOT.innerHTML='<style>'+%s+'</style>'+%s;\n") % (json.dumps(mount), json.dumps(mount), json.dumps(css, ensure_ascii=False), json.dumps(body, ensure_ascii=False))
full = loader + js + '\n})();\n'
b64 = base64.b64encode(full.encode('utf-8')).decode()
snippet = ('<div id="%s"></div><script>(function(){var s=document.currentScript,b=atob("%s"),u=new Uint8Array(b.length);'
  'for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);var c=document.createElement("script");c.text=new TextDecoder().decode(u);'
  's.parentNode.insertBefore(c,s);})();</script>\n') % (mount, b64)
open(out, 'w', encoding='utf-8').write(snippet)
print('OK', out, len(snippet), 'Zeichen')
