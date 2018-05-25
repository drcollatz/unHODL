FROM node:alpine


# Create app directory
WORKDIR /usr/src/app

RUN apk add -U tzdata && \
    cp /usr/share/zoneinfo/Europe/Berlin /etc/localtime

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm install --only=production

# Bundle app source
COPY . .

CMD [ "npm", "start" ]