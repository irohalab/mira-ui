import {Component, OnInit, OnDestroy} from '@angular/core';
// import {BaseError} from '../../helpers/error';
import {Title} from '@angular/platform-browser';
import {ActivatedRoute} from '@angular/router';
import {Subscription} from 'rxjs';
import {UserService} from '../user-service';


@Component({
    selector: 'error-page',
    templateUrl: './error.html',
    standalone: false
})
export class ErrorComponent implements OnInit, OnDestroy {

  constructor(titleService: Title, private route: ActivatedRoute, private userService: UserService) {
    titleService.setTitle('出错了!');
  }

  errorMessage: string;

  errorStatus: string;

  private routeParamsSubscription: Subscription;

  get isLoginRequired(): boolean {
    return this.errorStatus === '401';
  }

  login(): void {
    this.userService.login();
  }

  ngOnInit(): any {
    this.routeParamsSubscription = this.route.params.subscribe(
      (params) => {
        this.errorMessage = params['message'];
        this.errorStatus = params['status'];
      }
    );
    return null;
  }

  ngOnDestroy(): any {
    if(this.routeParamsSubscription) {
      this.routeParamsSubscription.unsubscribe();
    }
    return null;
  }
}
