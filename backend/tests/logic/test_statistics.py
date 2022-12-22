import pytest
from hamcrest import assert_that, contains_exactly

from deepchecks_monitoring.logic.statistics import _add_scaled_bins_names


@pytest.mark.asyncio
async def test_statistics_bin_names():
    # Arrange
    bins = [{'min': 0.00003243, 'max': 0.001},
            {'min': 0.05, 'max': 0.1},
            {'min': 0.2, 'max': 0.3},
            {'min': 10.00001, 'max': 10.00001},
            {'min': 10.00002, 'max': 12.99999},
            {'min': 13, 'max': 13.0002},
            {'min': 13.00004, 'max': 13.00006},
            {'min': 13.0012, 'max': 14.12333},
            {'min': 20.12323, 'max': 22}]

    # Act
    _add_scaled_bins_names(bins)

    # Assert
    names = [it['name'] for it in bins]
    assert_that(names, contains_exactly('[3.24e-05, 0.05)', '[0.05, 0.2)', '[0.2, 10.00001)', '[10.00001, 10.00002)',
                                        '[10.00002, 13)', '[13, 13.00004)', '[13.00004, 13.001)', '[13.001, 20.12)',
                                        '[20.12, 22]'))


@pytest.mark.asyncio
async def test_statistics_bin_names_with_none():
    # Arrange
    bins = [{'min': 0.00003243, 'max': 0.001},
            {'min': 0.05, 'max': 0.1},
            {'min': 0.2, 'max': 0.3},
            {'min': 10.00001, 'max': 10.00001},
            {'min': 10.00002, 'max': 12.99999},
            {'min': 13, 'max': 13.0002},
            {'min': 13.00004, 'max': 13.00006},
            {'min': 13.0012, 'max': 14.12333},
            {'min': 20.12323, 'max': 22},
            {'min': None, 'max': None}]

    # Act
    _add_scaled_bins_names(bins)

    # Assert
    names = [it['name'] for it in bins]
    assert_that(names, contains_exactly('[3.24e-05, 0.05)', '[0.05, 0.2)', '[0.2, 10.00001)', '[10.00001, 10.00002)',
                                        '[10.00002, 13)', '[13, 13.00004)', '[13.00004, 13.001)', '[13.001, 20.12)',
                                        '[20.12, 22]', 'Null'))
