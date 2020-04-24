module.exports = {
    rules: {
        'type-enum': [
            2,
            'always',
            [
                'build',
                'ci',
                'chore',
                'docs',
                'feat',
                'fix',
                'perf',
                'refactor',
                'revert',
                'style',
                'test'
            ]
        ],
        'scope-enum': [
            2,
            'always',
            ['all', 'release', 'site', 'admin', 'api', 'db', 'deps', 'deps-dev']
        ],
        'body-leading-blank': [1, 'always'],
        'footer-leading-blank': [1, 'always'],
        'header-max-length': [2, 'always', 72],
        'scope-case': [2, 'always', 'lower-case'],
        'subject-empty': [2, 'never'],
        'type-case': [2, 'always', 'lower-case'],
        'type-empty': [2, 'never']
    }
};
