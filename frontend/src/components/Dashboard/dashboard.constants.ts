export const constants = {
  modelList: {
    heading: 'Models',
    searchFieldPlaceholder: 'Search Model...',
    reset: 'Reset selection',
    modelItem: {
      lastDataUpdate: 'Last data update:',
      noDataErrorToolTipText: {
        popperText: 'No prediction data for this model. For more information please refer to the',
        popperLink: 'https://docs.deepchecks.com/monitoring/stable/user-guide',
        popperLinkText: ' User Guide. '
      },
      noDataErrorImageAlt: 'warning icon',
      noDataDataUpdate: 'Data update in progress'
    }
  },
  monitorDrawer: {
    graph: {
      title: 'No data to show, try altering the filters',
      reset: 'Reset changes'
    }
  },
  monitorList: {
    monitor: {
      alertRuleWidget: {
        alertRuleString: 'Alert Rule: '
      }
    },
    deleteMonitor: {
      title: 'Delete Monitor',
      submit: 'YES, CONTINUE',
      cancel: 'NO, CANCEL',
      messageStart: 'You are about to permanently delete ',
      name: (name: string | undefined) => (name ? name : 'current monitor'),
      messageEnd: ', this will also delete any alerts connected to this monitor. Are you sure you want to continue?'
    }
  },
  monitorInfoWidget: {
    zoomToolTipText: 'Zoom using mouse/touchpad',
    zoomReset: 'Reset'
  },
  noAlertText: 'No alert rule configured for this monitor'
};
