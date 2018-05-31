#!/bin/bash
docker stop unHODL
docker container rm unHODL
git pull
docker build -t drcollatz/unhodl .
docker run --name unHODL -d drcollatz/unhodl
