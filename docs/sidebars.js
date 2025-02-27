/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

module.exports = {
    lightdash: [
        'intro',
        {
            type: 'category',
            label: 'Getting started tutorials',
            link: {
                type: 'doc',
                id: 'get-started/intro',
            },
            collapsed: false,
            items: [
                {
                    type: 'category',
                    label: 'Setting up a new project',
                    link: {
                        type: 'doc',
                        id: 'get-started/setup-lightdash/intro',
                    },
                    items: [
                        'get-started/setup-lightdash/get-project-lightdash-ready',
                        'get-started/setup-lightdash/connect-project',
                        'get-started/setup-lightdash/intro-metrics-dimensions',
                        'get-started/setup-lightdash/using-explores',
                        'get-started/setup-lightdash/how-to-create-metrics',
                        'get-started/setup-lightdash/invite-new-users',
                        'get-started/setup-lightdash/sharing-insights',
                    ],
                },
                {
                    type: 'category',
                    label: 'Developing in Lightdash',
                    link: {
                        type: 'doc',
                        id: 'get-started/develop-in-lightdash/intro',
                    },
                    items: [
                        'get-started/develop-in-lightdash/exploring-your-content',
                        'get-started/develop-in-lightdash/intro-metrics-dimensions',
                        'get-started/develop-in-lightdash/using-explores',
                        'get-started/develop-in-lightdash/how-to-create-dimensions',
                        'get-started/develop-in-lightdash/how-to-create-metrics',
                        'get-started/develop-in-lightdash/sharing-insights',
                    ],
                },
                {
                    type: 'category',
                    label: 'Learning to explore data in Lightdash',
                    link: {
                        type: 'doc',
                        id: 'get-started/exploring-data/intro',
                    },
                    items: [
                        'get-started/exploring-data/exploring-your-content',
                        'get-started/exploring-data/intro-metrics-dimensions',
                        'get-started/exploring-data/using-explores',
                        'get-started/exploring-data/sharing-insights',
                        'get-started/exploring-data/dashboards',
                    ],
                },
            ],
        },
        {
            type: 'category',
            label: 'Guides',
            items: [
                {
                    type: 'category',
                    label: 'Self-hosting',
                    link: {
                        type: 'doc',
                        id: 'self-host/self-host-lightdash',
                    },
                    items: [
                        {
                            type: 'autogenerated',
                            dirName: 'self-host',
                        },
                    ],
                },
                'guides/adding-tables-to-lightdash',
                'guides/how-to-create-dimensions',
                'guides/how-to-create-metrics',
                'guides/how-to-join-tables',
                {
                    type: 'category',
                    label: 'The Lightdash CLI',
                    link: {
                        type: 'generated-index',
                        title: 'The Lightdash CLI',
                        description:
                            'The Lightdash CLI is the recommended way to develop your dbt + Lightdash project. It makes development faster and easier, as well as giving you options for building more powerful automation to manage your Lightdash instance. Here are some guides to get you started!',
                        slug: '/guides/cli/intro',
                        keywords: ['cli'],
                    },
                    items: [
                        'guides/cli/how-to-install-the-lightdash-cli',
                        'guides/cli/cli-authentication',
                        'guides/cli/how-to-upgrade-cli',
                        'guides/cli/how-to-auto-generate-schema-files',
                        'guides/cli/how-to-use-lightdash-preview',
                        'guides/cli/how-to-use-lightdash-deploy',
                        'guides/cli/how-to-compile-your-lightdash-project',
                        'guides/cli/how-to-use-lightdash-validate',
                    ],
                },
                'guides/visualizing-your-results',
                'guides/formatting-your-fields',
                'guides/limiting-data-using-filters',
                'guides/table-calculations/adding-table-calculations',
                {
                    type: 'category',
                    label: 'Table calculation SQL templates',
                    link: {
                        type: 'generated-index',
                        title: 'SQL templates',
                        description:
                            'Use our SQL templates to get started with your table calculations!',
                        slug: '/guides/table-calculations/sql-templates',
                        keywords: ['sql', 'templates'],
                    },
                    items: [
                        'guides/table-calculations/table-calculation-sql-templates/percent-change-from-previous',
                        'guides/table-calculations/table-calculation-sql-templates/percent-of-previous-value',
                        'guides/table-calculations/table-calculation-sql-templates/percent-of-total-column',
                        'guides/table-calculations/table-calculation-sql-templates/percent-of-group-pivot-total',
                        'guides/table-calculations/table-calculation-sql-templates/rank-in-column',
                        'guides/table-calculations/table-calculation-sql-templates/running-total',
                    ],
                },
                'guides/interactive-dashboards',
                'guides/spaces',
                'guides/pinning',
                'guides/sharing-in-slack',
                'guides/how-to-create-scheduled-deliveries',
                'guides/validating-your-content',
                'guides/how-to-create-multiple-projects',
                'guides/customizing-the-appearance-of-your-project',
                'guides/dbt-semantic-layer',
                'guides/how-to-reset-your-password',
            ],
        },
        {
            type: 'category',
            label: 'References',
            items: [
                {
                    type: 'doc',
                    id: 'references/dimensions',
                    label: 'Dimensions',
                },
                {
                    type: 'doc',
                    id: 'references/metrics',
                    label: 'Metrics',
                },
                {
                    type: 'doc',
                    id: 'references/tables',
                    label: 'Tables',
                },
                {
                    type: 'doc',
                    id: 'references/joins',
                    label: 'Joins',
                },
                'references/syncing_your_dbt_changes',
                'references/personal_tokens',
                'references/ip_addresses',
                'references/usage-analytics',
                {
                    type: 'doc',
                    id: 'references/filters',
                    label: 'Filters',
                },
                'references/roles',
                'references/user-attributes',
                'references/sql-variables',
            ],
        },

        {
            type: 'category',
            label: 'Lightdash University: Best Practice',
            items: [
                'best-practice/lightdash-way',
                'best-practice/planning-your-dashboard',
            ],
        },
        {
            type: 'category',
            label: 'Troubleshooting and getting help',
            items: [
                'help-and-contact/contact/contact_info',
                'help-and-contact/faqs/faqs',
            ],
        },
    ],
};
