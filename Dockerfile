FROM node:erbium-buster
MAINTAINER XD(dxd.spirits@gmail.com)

RUN mkdir /workspace/ -p
COPY . /workspace/
WORKDIR /workspace/

RUN npm install
RUN npm run build

CMD HOSTNAME=0.0.0.0 PORT=$PORT npm start
