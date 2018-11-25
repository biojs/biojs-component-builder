### biojs-builder



## About Docker Compose

The current version of [Iris](https://github.com/repositive/iris-js) requires an AMQP server. The docker-compose comes preconfigured to connect to one out of the box. You'll need to run an instance yourself and attach it to the network rabbit:

**Create the rabbit network**
```bash
$ docker network create rabbit
```

**Run a rabbitmq process**
```bash
$ docker run --name=rabbit --network=rabbit -p 5672:5672 -p 15672:15672 -d rabbitmq:3-management
```

If you run  `$ docker-compose up` now you should be able to see this service running using the iris cli `$ iris status`

## Notes

The repository has a `precommit` hook that will trigger linter for each commit. You can check it in the scripts section of the `package.json`
