import React from 'react';
import { render, screen } from '@testing-library/react';

import SuiteViewLoading from 'components/SuiteView/SuiteViewLoading';

import { constants } from '../../components/SuiteView/helpers/suiteViewPage.constants';

describe('SuiteViewLoading', () => {
  beforeEach(() => {
    render(<SuiteViewLoading />);
  });

  it('renders the component text correctly', () => {
    expect(screen.getByText(constants.loadingDescription)).toBeTruthy();
    expect(screen.getByText(constants.loadingHeader)).toBeTruthy();
  });

  it('renders the right image', () => {
    expect(screen.getAllByAltText(constants.loadingImgAlt)).toBeTruthy();
  });
});
