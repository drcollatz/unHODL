FROM node:alpine

ARG buildmode=

# Create app directory
WORKDIR /usr/src/app

RUN apk add -U tzdata && \
    cp /usr/share/zoneinfo/Europe/Berlin /etc/localtime

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install $buildmode

# Bundle app source
COPY . .

CMD [ "npm", "start" ]

