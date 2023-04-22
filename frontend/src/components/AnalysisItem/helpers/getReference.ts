import { CheckSchema, getCheckReferenceApiV1ChecksCheckIdRunReferencePost } from 'api/generated';

export interface GetReferenceProps {
  check: CheckSchema;
  compareByReference?: boolean;
  additionalKwargs: any;
  setAlertRules: (alertRules: any) => void;
}

export const getReference = (props: GetReferenceProps) => {
  const { check, compareByReference, additionalKwargs, setAlertRules } = props;

  if (compareByReference) {
    const getReferenceData = async () => {
      const response = await getCheckReferenceApiV1ChecksCheckIdRunReferencePost(check.id, {
        additional_kwargs: additionalKwargs
      });

      if (response && (response as any[])[0]) {
        setAlertRules(response);
      }
    };

    getReferenceData();
  } else {
    setAlertRules([]);
  }
};
