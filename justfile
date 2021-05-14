up:
  docker-compose up

clear:
  docker-compose rm -f

sub:
  yarn codegen

build:
  yarn build

bug: build up
