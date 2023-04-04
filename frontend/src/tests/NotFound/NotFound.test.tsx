import React from 'react';
import { render, screen } from '@testing-library/react';

import NotFound from 'components/NotFound/NotFound';

import { constants } from 'components/NotFound/notFound.constants';

describe('Not Found Test', () => {
  beforeEach(() => {
    render(<NotFound />);
  });

  it('renders the component text correctly', () => {
    expect(screen.getByText(constants.description)).toBeTruthy();
    expect(screen.getByText(constants.title)).toBeTruthy();
  });

  it('renders the right image', () => {
    expect(screen.getAllByAltText(constants.imgAlt)).toBeTruthy();
  });

  it('renders the right button ', () => {
    expect(screen.getByText(constants.button.label)).toBeTruthy();
  });
});
