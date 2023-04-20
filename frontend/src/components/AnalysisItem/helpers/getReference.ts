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
      } // else {
      //     setAlertRules([
      //       {
      //         alert_severity: 'high',
      //         id: 1169,
      //         is_active: true,
      //         monitor_id: 2199,
      //         start_time: null,
      //         condition: {
      //           operator: 'greater_than',
      //           value: 0.25
      //         }
      //       }
      //     ]);
      //   }
    };

    getReferenceData();
  } else {
    setAlertRules([]);
  }
};
