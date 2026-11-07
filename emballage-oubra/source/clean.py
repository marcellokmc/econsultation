import sys, re
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, StreamObject
r = PdfReader(sys.argv[1]); w = PdfWriter(clone_from=r)
std = set()
for pg in w.pages:
    fonts = pg["/Resources"]["/Font"].get_object()
    for k in fonts:
        if any(n in str(fonts[k].get_object().get("/BaseFont")) for n in ("Helvetica", "Times")): std.add(k)
for pg in w.pages:
    data = pg.get_contents().get_data()
    for k in std:
        data = re.sub(rb'BT ' + re.escape(k.encode()) + rb' [\d.]+ Tf [\d.]+ TL ET\n', b'', data)
        assert not re.search(re.escape(k.encode()) + rb'\b', data), k
    s = StreamObject(); s.set_data(data); pg[NameObject("/Contents")] = w._add_object(s)
for pg in w.pages:
    fonts = pg["/Resources"]["/Font"].get_object()
    for k in std:
        if k in fonts: del fonts[k]
print("removed", std)
w.write(sys.argv[2])
