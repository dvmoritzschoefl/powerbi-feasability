FROM python:3.7

WORKDIR /usr/src/app

RUN apt-get update
#RUN apt-get install -y fuse libfuse2 libfuse-dev

RUN pip install higlass-python clodius

COPY binning.py /usr/src/app/binning.py
COPY server.py /usr/src/app/server.py
COPY fvz2.csv /usr/src/app/fvz2.csv

RUN pip install Werkzeug==2.0.0
RUN pip install flask==2.1.3

# The code to run when container is started:
ENTRYPOINT ["python3", "server.py"]