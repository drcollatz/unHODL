#!/bin/bash
path=`pwd`
docker stop unHODL
docker container rm unHODL
git pull
docker build -t drcollatz/unhodl .
docker run -v $path/conf:/app/conf --name unHODL -d drcollatz/unhodl