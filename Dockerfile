FROM node:alpine as builder
WORKDIR /usr/src/app
COPY . .
ARG buildmode=
RUN npm install $buildmode


FROM node:alpine
WORKDIR /app
RUN apk add -U tzdata && \
    cp /usr/share/zoneinfo/Europe/Berlin /etc/localtime
USER node
COPY --from=builder --chown=node:node /usr/src/app /app
CMD [ "npm", "start" ]

