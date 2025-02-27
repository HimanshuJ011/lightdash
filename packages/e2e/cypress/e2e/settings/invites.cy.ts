describe('Settings - Invites', () => {
    beforeEach(() => {
        cy.login();
        cy.visit('/');
    });

    it('Should invite user', () => {
        cy.findAllByTestId('settings-menu').click();
        cy.findByRole('menuitem', { name: 'Organization settings' }).click();

        cy.contains('User management').click();
        cy.contains('button', 'Add user').click();
        cy.findByLabelText('Enter user email address *').type(
            'demo+marygreen@lightdash.com',
        );
        cy.contains(/(Generate|Send) invite/).click();
        cy.get('#invite-link-input').then(($input) => {
            const value = $input.val();
            if (typeof value === 'string') {
                cy.logout();
                cy.visit(value);
            }
        });
        cy.get('[data-cy="welcome-user"]').should('be.visible');
        cy.contains('Join your team').click();
        cy.findByPlaceholderText('Your first name').type('Mary');
        cy.findByPlaceholderText('Your last name').type('Green');
        cy.get('[data-cy="email-address-input"]')
            .should('be.disabled')
            .should('have.value', 'demo+marygreen@lightdash.com');
        cy.findByPlaceholderText('Your password').type('PasswordMary1').blur();
        cy.get('[data-cy="signup-button"]').click();
        cy.findByTestId('pin-input')
            .get('*[class^="mantine-PinInput-input"]')
            .then((inputs) => {
                [...inputs].forEach((input) => cy.wrap(input).type('0'));
            });
        cy.contains('Submit').click();
        cy.contains('Continue').click();
        cy.findByTestId('user-avatar').should('contain', 'MG');
    });

    it('Should delete user', () => {
        cy.findAllByTestId('settings-menu').click();
        cy.findByRole('menuitem', { name: 'Organization settings' }).click();

        cy.contains('User management').click();
        cy.get('table')
            .contains('tr', 'demo+marygreen@lightdash.com')
            .contains('td', 'Delete')
            .click();
        cy.findByText('Are you sure you want to delete this user ?')
            .parents('.mantine-Modal-root')
            .findByText('Delete')
            .click();
        cy.findByText('Success! User was deleted.').should('be.visible');
        cy.findByText('demo+marygreen@lightdash.com').should('not.exist');
    });
});
