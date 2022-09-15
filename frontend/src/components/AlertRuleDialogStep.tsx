import React from 'react';
import { Button, ButtonProps, Stack } from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { RightArrow } from 'assets/icon/icon';
import deepmerge from 'deepmerge';
import { SxProps } from '@mui/system';

type GetFieldProps<T> = (fieldName: keyof T, onChange?: (value: T[keyof T]) => unknown) => Record<string, unknown>;

export type AlertRuleDialogStepRenderArgs<T> = {
  getFieldProps: GetFieldProps<T>;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  isEdit: boolean;
};

export type AlertRuleDialogStepRender<T> = ({
  getFieldProps,
  setFieldValue,
  isEdit
}: AlertRuleDialogStepRenderArgs<T>) => JSX.Element;

export interface AlertRuleDialogStepBase<T> {
  isEdit: boolean;
  onSubmit: (values: T) => void;
  initialValues: T;
  buttonProps?: ButtonProps;
}

export interface AlertRuleDialogStep<T> extends AlertRuleDialogStepBase<T> {
  validationSchema: yup.ObjectSchema<any>;
  children: AlertRuleDialogStepRender<T>;
  sx?: SxProps;
}

const DEFAULT_BUTTON_PROPS = {
  startIcon: <RightArrow fill="currentColor" />,
  children: 'Next'
};

export const AlertRuleDialogStep = <T extends Record<string, any>>({
  isEdit,
  initialValues,
  onSubmit,
  validationSchema,
  children,
  sx = {},
  buttonProps: _buttonProps = {}
}: AlertRuleDialogStep<T>) => {
  const {
    handleChange,
    handleSubmit,
    errors,
    touched,
    setFieldValue,
    getFieldProps: getFieldPropsFormik
  } = useFormik<T>({
    validationSchema,
    initialValues,
    onSubmit
  });

  const buttonProps = deepmerge<ButtonProps>(DEFAULT_BUTTON_PROPS, _buttonProps);

  const getFieldProps: GetFieldProps<T> = (fieldName, onChange) => ({
    ...getFieldPropsFormik(fieldName),
    onChange: (e: Event) => {
      handleChange(e);
      onChange?.((e.target as HTMLInputElement).value as T[keyof T]);
    },
    error: touched[fieldName] && Boolean(errors[fieldName]),
    helperText: touched[fieldName] && errors[fieldName]
  });

  return (
    <Stack
      component="form"
      sx={deepmerge<SxProps>(
        {
          maxWidth: 487,
          margin: '50px auto',
          '> *': {
            mb: '40px'
          }
        },
        sx
      )}
      onSubmit={handleSubmit}
    >
      {children({ getFieldProps, setFieldValue, isEdit })}
      <Button sx={{ minWidth: '100%', p: '17px 0', mb: '0 !important' }} {...buttonProps} type="submit" />
    </Stack>
  );
};
