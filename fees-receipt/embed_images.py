import base64
import os

def get_base64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode('utf-8')

dir_path = "c:\\Users\\vinit\\OneDrive\\Desktop\\edhorizon\\fees-receipt"
logo_b64 = get_base64(os.path.join(dir_path, "logo.png"))
sig_b64 = get_base64(os.path.join(dir_path, "signature.png"))

html_path = os.path.join(dir_path, "index.html")
with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

# Replace logo
html = html.replace('src="logo.png"', f'src="data:image/png;base64,{logo_b64}"')
# Replace signature
html = html.replace('src="signature.png"', f'src="data:image/png;base64,{sig_b64}"')

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)

print("HTML updated with Base64 images successfully.")
