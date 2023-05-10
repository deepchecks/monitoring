# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
from gevent.pool import Group
from locust import FastHttpUser, between, task


class User(FastHttpUser):
    wait_time = between(1, 5)
    host = 'https://app.deepchecks.com'
    default_headers = {'Authorization': 'basic API-TOKEN'}

    @task
    def run_analysis(self):
        body = {'frequency': "DAY", 'start_time': "2023-02-28T23:59:59.000Z", 'end_time': "2023-03-31T23:59:59.000Z"}
        checks = [874, 875, 876, 877, 878, 879, 880, 881]
        group = Group()
        # This will spawn the number of requests needed in parallel
        for check in checks:
            group.spawn(lambda: self.client.post(f"/api/v1/checks/{check}/run/lookback", json=body,
                                                 headers=self.default_headers))
        # Once they are ready they are hit in parallel
        group.join()
