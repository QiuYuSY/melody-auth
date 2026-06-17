import {
  useCallback, useMemo, useState,
} from 'hono/jsx'
import { object } from 'yup'
import {
  routeConfig, typeConfig,
} from 'configs'
import {
  validate, emailField, passwordField,
  requiredField,
} from 'pages/tools/form'
import { View } from 'pages/hooks'
import {
  handleAuthorizeStep, parseAuthorizeBaseValues,
  parseResponse,
} from 'pages/tools/request'
import { AuthorizeParams } from 'pages/tools/param'

export interface UseSignInFormProps {
  locale: typeConfig.Locale;
  params: AuthorizeParams;
  onSubmitError: (error: string | null) => void;
  onSwitchView: (view: View) => void;
  usePasswordlessAsMagicLink?: boolean;
}

const useSignInForm = ({
  locale,
  params,
  onSubmitError,
  onSwitchView,
  usePasswordlessAsMagicLink = false,
}: UseSignInFormProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accessKey, setAccessKey] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPasswordlessSigningIn, setIsPasswordlessSigningIn] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  const [touched, setTouched] = useState({
    email: false,
    password: false,
    accessKey: false,
  })

  const values = useMemo(
    () => ({
      email,
      password,
      accessKey,
    }),
    [email, password, accessKey],
  )

  const signInSchema = object({
    email: emailField(locale),
    password: passwordField(locale),
    accessKey: requiredField(locale),
  })

  const errors = validate(
    signInSchema,
    values,
  )

  const handleChange = (
    name: 'email' | 'password' | 'accessKey', value: string,
  ) => {
    onSubmitError(null)
    switch (name) {
    case 'email':
      setEmail(value)
      break
    case 'password':
      setPassword(value)
      break
    case 'accessKey':
      setAccessKey(value)
      break
    }
  }

  const handleSubmit = useCallback(
    (e: Event) => {
      e.preventDefault()
      setTouched({
        email: true,
        password: true,
        accessKey: true,
      })

      if (Object.values(errors).some((error) => error !== undefined)) {
        return
      }

      setIsSubmitting(true)

      fetch(
        routeConfig.IdentityRoute.AuthorizePassword,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            accessKey,
            ...parseAuthorizeBaseValues(
              params,
              locale,
            ),
          }),
        },
      )
        .then(parseResponse)
        .then((response) => {
          handleAuthorizeStep(
            response,
            locale,
            onSwitchView,
          )
        })
        .catch((error) => {
          onSubmitError(error)
        })
        .finally(() => {
          setIsSubmitting(false)
        })
    },
    [params, locale, onSubmitError, onSwitchView, email, password, accessKey, errors],
  )

  const handlePasswordlessSignIn = useCallback(
    (e: Event) => {
      e.preventDefault()
      setTouched({
        email: true,
        password: false,
        accessKey: true,
      })

      if (errors.email !== undefined || errors.accessKey !== undefined) {
        return
      }

      setIsPasswordlessSigningIn(true)

      fetch(
        routeConfig.IdentityRoute.AuthorizePasswordless,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            accessKey,
            ...parseAuthorizeBaseValues(
              params,
              locale,
            ),
          }),
        },
      )
        .then(parseResponse)
        .then((response: any) => {
          if (usePasswordlessAsMagicLink && 'code' in response && response.code) {
            return fetch(
              routeConfig.IdentityRoute.SendPasswordlessCode,
              {
                method: 'POST',
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  code: response.code,
                  locale,
                }),
              },
            )
              .then(parseResponse)
              .then(() => {
                setMagicLinkSent(true)
              })
          }
          handleAuthorizeStep(
            response,
            locale,
            onSwitchView,
          )
        })
        .catch((error) => {
          onSubmitError(error)
        })
        .finally(() => {
          setIsPasswordlessSigningIn(false)
        })
    },
    [params, locale, onSubmitError, onSwitchView, email, accessKey, errors, usePasswordlessAsMagicLink],
  )

  return {
    values,
    errors: {
      email: touched.email ? errors.email : undefined,
      password: touched.password ? errors.password : undefined,
      accessKey: touched.accessKey ? errors.accessKey : undefined,
    },
    handleChange,
    handleSubmit,
    handlePasswordlessSignIn,
    isSubmitting,
    isPasswordlessSigningIn,
    magicLinkSent,
  }
}

export default useSignInForm
