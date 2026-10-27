Title: easyVerein API Documentation

URL Source: https://easyverein.com/api/

Markdown Content:
[![Image 1: Brand](https://easyverein.com/static/logo.png)](https://easyverein.com/api/)

## easyVerein API documentation

This is the official documentation of the easyVerein API. You can navigate to specific versions below.

### What the easyVerein API is capable of

With the help of the API it is possible to create your own complex application form by building it anywhere and sending the data to easyVerein via the API.

To use the API you need a token, you can generate one [here](https://easyverein.com/app/settings/easyVereinApi/).

The possibilities of the API don't end there, it's also possible to automate invoices with the API, do some one time collection activities or manage members and addresses.  In principle its possible to do almost everything that's possible with the web app at [easyverein.com](https://easyverein.com/api/easyverein.com) except for exporting/importing.

The entire easyVerein app (except the video meetings) is based on the API and therefore nothing more than just an client for the easyVerein service.

### Versioning

If you want to get rid of the versioning, you can alternatively use the terms `/stable` and `/latest` to always use the latest or stable version of the API. Please note that it is possible that breaking changes will be made, so `latest` and `stable` may cause issues.

### FAQ

##### What is an API anyway?

An application programming interface (API) is a way for two or more computer programs to communicate with each other. It is a type of software interface, offering a service to other pieces of software.

In contrast to a user interface, which connects a computer to a person, an application programming interface connects computers or pieces of software to each other. It is not intended to be used directly by a person (the end user) other than a computer programmer who is incorporating it into the software.

[Source](https://en.wikipedia.org/wiki/API)

##### What should I use the API for and what should I not use it for?

An API is used to connect pieces of software. This means that this API is used to manipulate, query, create or delete certain entries inside a database from another software. Moreover, this API handles validation and can trigger some special functions for easyVerein.

To simply answer the question: You should use this API to interact with your data inside easyVerein.

**You should not use the API to extract data from easyVerein.** This is not the usecase of any API. Use the export function of easyVerein instead.

##### I am not a programmer, however, I wonder if I can make use of the easyVerein API?

Please consider our [FAQ](https://hilfe.easyverein.com/en/articles/360898)

##### What do the versions of the API mean?

There are two different ways to ship software updates to the user: rolling release and stable versioning. We prefer the last one. This means that we develop (making changes, sometimes even breaking changes) only in the newest version that is marked as `latest`. The version marked as `stable` is safe to use.

### These are the versions that are currently available:

| Version | Status | Available until | Documentation |
| --- | --- | --- | --- |
| v1.7 | Deprecated | 2026 | [Documentation](https://easyverein.com/api/v1.7/documentation) |
| v2.0 | Stable | 2027 | [Documentation](https://easyverein.com/api/v2.0/documentation) |
| v3.0 | Latest | - | [Documentation](https://easyverein.com/api/v3.0/documentation) |
