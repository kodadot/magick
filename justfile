up:
  docker-compose up

clear:
  docker-compose rm -f

types:
  yarn codegen

build:
  yarn build

bug: build up
