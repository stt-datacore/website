# CONTRIBUTING

Contributions are always welcome, no matter how large or small. Before contributing,
please read the [code of conduct](CODE_OF_CONDUCT.md).

If you want to contribute content (CMS pages, BigBook additions, use the website form for a nicer editing interface), or submit PRs here with the MarkDown changes. All information on characters, events and related content is automatically generated from various external sources. Therefore we do not require manual contibutions related to in game content.  

If you want to contribute code fixes, see below.

## Setup

> Install node on your system: [https://nodejs.org/](https://nodejs.org/en/)

### Install dependencies

```sh
$ git clone https://github.com/stt-datacore/website.git
$ yarn install 
```

In order to get images on your server you have to run the command. 
```sh
$ cp .env.default .env
```
Then change the line "GATSBY_ASSETS_URL=" to "GATSBY_ASSETS_URL=http://assets.datacore.app/".

## Available scripts

### `start`

Starts the development server.

#### Usage

```sh
$ yarn run start
```

### `build`

Build the static files into the `public` folder.

#### Usage

```sh
$ yarn run build
```

### `serve`

This command is shorthand for `gatsby serve` 

#### Usage

```sh
yarn run serve
```

### `test`

Not implmented yet

#### Usage

```sh
yarn run test
```

### `format`

Formats code and docs according to our style guidelines using `prettier`

#### Usage

```sh
yarn run format
```

## Pull Requests

We actively welcome your pull requests!

If you need help with Git or our workflow, please ask us. We want your contributions even if you're just learning Git. Our maintainers are happy to help!

PR's should be [rebased](https://www.atlassian.com/git/tutorials/merging-vs-rebasing) on master when opened, and again before merging.

1. Fork the repo.
2. Create a branch from `master`. If you're addressing a specific issue, prefix your branch name with the issue number.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Run `yarn run test` and ensure the test suite passes. (Not applicable yet)
5. Use `yarn run format` to format and lint your code.
6. PR's must be rebased before merge (feel free to ask for help).
7. PR should be reviewed by at least one maintainer prior to merging.

## License

By contributing to the DataCore project, you agree that your contributions will be licensed under its [MIT license](LICENSE).
