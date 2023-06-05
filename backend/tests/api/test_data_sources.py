from unittest.mock import patch

import pytest
from starlette.testclient import TestClient


@pytest.mark.asyncio
async def test_data_source_apis(
    client: TestClient,
):
    with patch('deepchecks_monitoring.ee.api.v1.data_sources.boto3'):
        # Create a data source
        response = client.put('/api/v1/data-sources',
                              json={'type': 's3',
                                    'parameters': {
                                        'aws_access_key_id': 'test',
                                        'aws_secret_access_key': 'test',
                                        'region': 'us-east-1'
                                        }
                                     }
                              )
    assert response.status_code == 200, (response.content, response.json())

    # Get data sources
    response = client.get('/api/v1/data-sources')
    assert response.json() == [{'id': 1, 'type': 's3', 'parameters':
        {'aws_access_key_id': 'test', 'aws_secret_access_key': 'test', 'region': 'us-east-1'}}]

    # Delete data source
    response = client.delete('/api/v1/data-sources/1')
    assert response.status_code == 200, (response.content, response.json())
