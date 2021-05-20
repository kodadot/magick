up:
  docker-compose up

clear:
  docker-compose rm -f
  rm -rf .data

types:
  yarn codegen

build:
  yarn build

bug: build up
