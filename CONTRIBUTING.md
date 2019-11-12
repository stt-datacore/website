# CONTRIBUTING

Contributions are always welcome, no matter how large or small. Before contributing,
please read the [code of conduct](CODE_OF_CONDUCT.md).

If you want to contribute content (CMS pages, BigBook additions, use the website form for a nicer editing interface), or submit PRs here with the MarkDown changes.

If you want to contribute code fixes, see below.

## Setup

> Install node on your system: [https://nodejs.org/](https://nodejs.org/en/)

### Install dependencies

```sh
$ git clone https://github.com/TemporalAgent7/datacore
$ npm install 
```

## Available scripts

### `start`

Starts the development server.

#### Usage

```sh
$ npm run start
```

### `build`

Build the static files into the `public` folder.

#### Usage

```sh
$ npm run build
```

### `serve`

This command is shorthand for `gatsby serve` 

#### Usage

```sh
npm run serve
```

### `test`

Not implmented yet

#### Usage

```sh
npm run test
```

### `format`

Formats code and docs according to our style guidelines using `prettier`

#### Usage

```sh
npm run format
```

## Pull Requests

We actively welcome your pull requests!

If you need help with Git or our workflow, please ask us. We want your contributions even if you're just learning Git. Our maintainers are happy to help!

PR's should be [rebased](https://www.atlassian.com/git/tutorials/merging-vs-rebasing) on master when opened, and again before merging.

1. Fork the repo.
2. Create a branch from `master`. If you're addressing a specific issue, prefix your branch name with the issue number.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Run `npm run test` and ensure the test suite passes. (Not applicable yet)
5. Use `npm run format` to format and lint your code.
6. PR's must be rebased before merge (feel free to ask for help).
7. PR should be reviewed by at least one maintainer prior to merging.

## License

By contributing to the DataCore project, you agree that your contributions will be licensed under its [MIT license](LICENSE).
