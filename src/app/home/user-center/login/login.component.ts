import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UserService } from '../../../user-service';
import { NgClass, NgIf } from '@angular/common';
import { AuthError } from '../../../../helpers/error';

@Component({
  selector: 'app-login',
    imports: [
        ReactiveFormsModule,
        NgClass,
        NgIf
    ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.less'
})
export class LoginComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();

    loginForm: FormGroup;

    inProgress: boolean = false;

    errorMessage: string;

    @Output()
    loginSuccess = new EventEmitter<boolean>();

    constructor(private userService: UserService,
                private formBuilder: FormBuilder) {
    }

    private buildForm(): void {
        this.loginForm = this.formBuilder.group({
            name: ['', Validators.required],
            password: ['', Validators.required],
            remember: [false]
        });
    };

    ngOnInit(): void {
        this.buildForm();
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    login(): void {
        const {name, password} = this.loginForm.value;
        this.inProgress = true;
        this._subscription.add(
            this.userService.loginAlbireoAccount(name, password)
                .subscribe({
                    next: () => {
                        this.loginSuccess.emit(true);
                    },
                error: (error) => {
                    this.inProgress = false;
                    if (error instanceof AuthError) {
                        if (error.isLoginFailed()) {
                            this.errorMessage = '用户名或密码错误';
                        } else {
                            this.errorMessage = 'Something Happened';
                        }
                    } else {
                        this.errorMessage = '未知错误';
                    }
                }})
        );
    }
}
