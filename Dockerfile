FROM node:erbium-buster
MAINTAINER XD(dxd.spirits@gmail.com)

RUN mkdir /workspace/ -p
COPY . /workspace/
WORKDIR /workspace/

RUN npm install
RUN npm run build

CMD npm start
