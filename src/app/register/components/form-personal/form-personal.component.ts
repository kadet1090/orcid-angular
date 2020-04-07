import { Component, OnInit, forwardRef } from '@angular/core'
import {
  FormGroup,
  ControlValueAccessor,
  Validator,
  FormControl,
  AbstractControl,
  ValidationErrors,
  NG_VALUE_ACCESSOR,
  NG_VALIDATORS,
  Validators,
  AsyncValidatorFn,
  ValidatorFn,
} from '@angular/forms'
import { BaseForm } from '../BaseForm'
import {
  TLD_REGEXP,
  ILLEGAL_NAME_CHARACTERS_REGEXP,
  URL_REGEXP,
} from 'src/app/constants'
import { Observable } from 'rxjs'
import { RegisterService } from 'src/app/core/register/register.service'
import { map } from 'rxjs/operators'
import { OrcidValidators } from 'src/app/validators'

@Component({
  selector: 'app-form-personal',
  templateUrl: './form-personal.component.html',
  styleUrls: ['./form-personal.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormPersonalComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => FormPersonalComponent),
      multi: true,
    },
  ],
})
export class FormPersonalComponent extends BaseForm
  implements OnInit, ControlValueAccessor, Validator {
  emails: FormGroup = new FormGroup({})
  additionalEmails: FormGroup = new FormGroup({})
  constructor(private _register: RegisterService) {
    super()
  }

  ngOnInit() {
    this.emails = new FormGroup(
      {
        email: new FormControl('', {
          validators: [
            Validators.required,
            Validators.email,
            Validators.pattern(TLD_REGEXP),
          ],
          asyncValidators: this._register.backendValueValidate('email'),
        }),
        confirmEmail: new FormControl('', {
          validators: [
            Validators.required,
            Validators.email,
            Validators.pattern(TLD_REGEXP),
          ],
        }),
        additionalEmails: this.additionalEmails,
      },
      {
        validators: [
          OrcidValidators.matchValues('email', 'confirmEmail'),
          this.allEmailsAreUnique(),
        ],
        asyncValidators: [this._register.backendAdditionalEmailsValidate()],
        updateOn: 'blur',
      }
    )

    this.form = new FormGroup({
      givenNames: new FormControl('', {
        validators: [
          Validators.required,
          OrcidValidators.notPattern(ILLEGAL_NAME_CHARACTERS_REGEXP),
          OrcidValidators.notPattern(URL_REGEXP),
        ],
        asyncValidators: this._register.backendValueValidate('givenNames'),
      }),
      familyNames: new FormControl(''),
      emails: this.emails,
    })
    this.emails.statusChanges.subscribe(value => console.log(this.emails))
    this.additionalEmails.statusChanges.subscribe(value => {
      console.log('additional emails status changed to ', value)
      this.additionalEmails.vaida
    })
  }

  addAdditionalEmail(): void {
    const controlName = (
      Object.keys(this.additionalEmails.controls).length + 1
    ).toString()
    this.additionalEmails.addControl(
      controlName,
      new FormControl('', {
        validators: [Validators.email, Validators.pattern(TLD_REGEXP)],
        // asyncValidators: this._register.backendValueValidate(controlName),
      })
    )
  }

  allEmailsAreUnique(): ValidatorFn {
    return (formGroup: FormGroup) => {
      const registerForm = this._register.formGroupToEmailRegisterForm(
        formGroup
      )

      registerForm.emailsAdditional.forEach((additionalEmail, i) => {
        additionalEmail.errors = []
        if (additionalEmail.value === registerForm.email.value) {
          additionalEmail.errors.push('additionalEmailCantBePrimaryEmail')
        } else {
          registerForm.emailsAdditional.forEach((element, i2) => {
            if (i !== i2 && additionalEmail.value === element.value) {
              if (additionalEmail.errors.length === 0) {
                additionalEmail.errors.push('duplicatedAdditionalEmail')
              }
            }
          })
        }
      })
      console.log(registerForm)

      const hasError = this._register.setFormGroupEmailErrors(
        registerForm,
        formGroup,
        'allEmailsAreUnique'
      )
      if (hasError) {
        console.log('NOT ALL EMAILS ARE UNIQUE')
        return { notAllEmailsAreUnique: true }
      } else {
        return null
      }
    }
  }
}
