import logging
from higlass import Server

from binning import dftimeseries

#from flask import Flask

#app = Flask(__name__)


#@app.route('/')
#def hello():
#    return '<h1>Hello, World!</h1>'

#app.run(port=8888, host='0.0.0.0')

def test_hitile():
    ts = dftimeseries(uuid='michael')

    print("finished creating time series tiles...")



    server = Server(
        [ts],
        host='0.0.0.0',
        port=8787,
        fuse=False,
        root_api_address=None,
        log_file='log.txt',
        log_level=logging.DEBUG
    )
    server.start()

test_hitile()