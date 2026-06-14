"""
ClawSentinel - Public Link Generator
Tunnels localhost:8000 via ngrok and prints the shareable URL.
"""
import sys
from pyngrok import ngrok, conf
import time

# ── SET YOUR NGROK AUTHTOKEN HERE ──
NGROK_TOKEN = "2ySZxJf8OoFfuCmr8DxWuFh0Tm9_5ahWKjheqT5NfANeNcQVG"

print("=" * 55)
print("  ClawSentinel API - Public Link Generator")
print("=" * 55)

try:
    # Set auth token
    ngrok.set_auth_token(NGROK_TOKEN)

    # Open HTTP tunnel on port 8000
    tunnel = ngrok.connect(8000, "http")
    public_url = tunnel.public_url

    print("\n[OK] Tunnel is LIVE!\n")
    print("  Dashboard  : " + public_url + "/index.html")
    print("  API Demo   : " + public_url + "/api-demo.html")
    print("  Mentor Ppt : " + public_url + "/mentor-presentation.html")
    print("  API Root   : " + public_url + "/api/dashboard")
    print("\n  Share these links with anyone on the internet.")
    print("\n  Press Ctrl+C to stop the tunnel.\n")
    print("=" * 55)

    # Keep running
    while True:
        time.sleep(5)

except KeyboardInterrupt:
    print("\n[STOPPED] Tunnel closed.")
    ngrok.kill()
except Exception as e:
    print("\n[ERROR] " + str(e))
    ngrok.kill()
    sys.exit(1)
