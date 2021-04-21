# app.py

from flask import Flask, render_template
from base64 import urlsafe_b64encode
from string import ascii_lowercase
import json
import random

radio_channel = ''.join(random.choice(ascii_lowercase) for x in range(24))

app = Flask('Red Squadron')

MEMBERS = {
    "Wedge": "https://static.giantbomb.com/uploads/scale_medium/0/118/541218-wedge_antilles.jpg",
    "Luke": "https://www.banthaskull.com/images/Yavin/b5lukeskywalker.jpg",
    "Ackbar": "https://www.rebelscum.com/GG/admiral-ackbar/header.jpg",
}


@app.route("/radio/<name>", methods=['GET'])
def radio(name):
    if name in MEMBERS:
        identity = {
            "name": name,
            "avatar": MEMBERS[name]
        }
        jam_info = {
            "identity": identity
        }
        jam_hash = urlsafe_b64encode(json.dumps(jam_info).encode('utf-8')).decode('ascii')
        return render_template('radio.html', radio_channel=radio_channel, jam_hash=jam_hash)
    else:
        return "You are not in the squad"


app.run(debug = True)

