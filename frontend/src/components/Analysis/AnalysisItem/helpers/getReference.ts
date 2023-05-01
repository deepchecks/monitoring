import { CheckSchema, getCheckReferenceApiV1ChecksCheckIdRunReferencePost } from 'api/generated';
import { resError } from 'helpers/types/resError';

export interface GetReferenceProps {
  check: CheckSchema;
  compareByReference?: boolean;
  additionalKwargs: any;
  setReference: (alertRules: any) => void;
}

export const getReference = (props: GetReferenceProps) => {
  const { check, compareByReference, additionalKwargs, setReference } = props;

  if (compareByReference) {
    const getReferenceData = async () => {
      const response = await getCheckReferenceApiV1ChecksCheckIdRunReferencePost(check.id, {
        additional_kwargs: additionalKwargs
      });

      if (response && !(response as unknown as resError).error_message) {
        const dictRefValue = (response as any)[Object.keys(response as any)[0]];
        const dictRefInnerValue = (dictRefValue as any)[Object.keys(dictRefValue as any)[0]] ?? Number(dictRefValue);

        setReference([
          {
            condition: {
              operator: 'reference',
              value: dictRefInnerValue
            }
          }
        ]);
      }
    };

    getReferenceData();
  } else {
    setReference([]);
  }
};
