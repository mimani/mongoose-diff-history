# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [2.0.0](https://github.com/mimani/mongoose-diff-history/compare/v1.6.1...v2.0.0) (2020-04-24)

### ⚠ BREAKING CHANGES

-   lean no longer forced false for saveDiffs, may cause
    issues for some

### Bug Fixes

-   cannot use \$timestamps, lean not respected ([6a24f4d](https://github.com/mimani/mongoose-diff-history/commit/6a24f4d73c1700c1971552d25a1ad0096b8eb7b7))
-   fix lean option override in findOneAndUpdate pre hook
-   fix findOneAndUpdate pre hook
-   findOneAndUpdate pre hook is not working as expected when timestamps autogeneration is enabled
