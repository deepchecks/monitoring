import dayjs from 'dayjs';

export const constants = {
  loadingHeader: 'Almost there...',
  loadingDescription: 'Running the full test suite is in progress',
  loadingImgAlt: 'loading suite img',
  suiteViewHeaderTitle: (modelVersionId: number) => `Test suite for model: ${modelVersionId}`,
  suiteViewHeaderDate: (startDate: string, endDate: string) =>
    `${dayjs(startDate).format('lll')} - ${dayjs(endDate).format('lll')}`,
  suiteViewHeaderCategory: 'category2:',
  suiteViewHeaderCart: 'cart_to_p_hist:'
};
