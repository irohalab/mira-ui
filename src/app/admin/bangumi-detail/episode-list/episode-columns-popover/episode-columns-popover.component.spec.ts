import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DARK_THEME, DarkThemeService, UIPopoverRef } from '@irohalab/deneb-ui';
import { of } from 'rxjs';
import { EpisodeColumnsPopoverComponent } from './episode-columns-popover.component';

describe('EpisodeColumnsPopoverComponent', () => {
  let component: EpisodeColumnsPopoverComponent;
  let fixture: ComponentFixture<EpisodeColumnsPopoverComponent>;
  let popoverRef: jasmine.SpyObj<UIPopoverRef<EpisodeColumnsPopoverComponent>>;
  let anchor: HTMLButtonElement;

  beforeEach(async () => {
    popoverRef = jasmine.createSpyObj('UIPopoverRef', ['close', 'updatePosition']);
    await TestBed.configureTestingModule({
      imports: [EpisodeColumnsPopoverComponent],
      providers: [
        {provide: UIPopoverRef, useValue: popoverRef},
        {provide: DarkThemeService, useValue: {themeChange: of(DARK_THEME)}}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EpisodeColumnsPopoverComponent);
    component = fixture.componentInstance;
    component.columns = [
      {key: 'episodeNo', label: 'episodeNo', defaultVisible: true},
      {key: 'id', label: 'id', defaultVisible: false}
    ];
    component.visibleColumnKeys = ['episodeNo'];
    anchor = document.createElement('button');
    document.body.appendChild(anchor);
    component.anchorElement = anchor;
    fixture.detectChanges();
  });

  afterEach(() => {
    anchor.remove();
  });

  it('renders field names and the selected columns', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(Array.from(element.querySelectorAll('label'), label => label.textContent.trim())).toEqual(['episodeNo', 'id']);
    expect(element.querySelector<HTMLInputElement>('#episode-column-episodeNo').checked).toBeTrue();
    expect(element.querySelector<HTMLInputElement>('#episode-column-id').checked).toBeFalse();
  });

  it('emits the column selected without closing the popup', () => {
    const toggleSpy = spyOn(component.columnToggle, 'emit');

    fixture.nativeElement.querySelector('#episode-column-id').click();

    expect(toggleSpy).toHaveBeenCalledWith('id');
    expect(popoverRef.close).not.toHaveBeenCalled();
  });

  it('emits reset without closing the popup', () => {
    const resetSpy = spyOn(component.reset, 'emit');

    fixture.nativeElement.querySelector('.column-options-heading button').click();

    expect(resetSpy).toHaveBeenCalled();
    expect(popoverRef.close).not.toHaveBeenCalled();
  });

  it('disables the last selected checkbox', () => {
    expect(fixture.nativeElement.querySelector('#episode-column-episodeNo').disabled).toBeTrue();
  });

  it('does not dismiss the popup on the opening button click', () => {
    anchor.click();

    expect(popoverRef.close).not.toHaveBeenCalled();
  });

  it('dismisses the popup on an outside click', () => {
    document.body.click();

    expect(popoverRef.close).toHaveBeenCalledTimes(1);
  });

  it('dismisses on Escape and restores focus to the columns button', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));

    expect(popoverRef.close).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(anchor);
  });

  it('keeps detached popup controls readable in dark mode', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.classList.contains('dark-theme')).toBeTrue();
    expect(element.querySelector('.column-options').classList.contains('inverted')).toBeTrue();
    expect(element.querySelector('.column-options-heading button').classList.contains('inverted')).toBeTrue();
    expect(getComputedStyle(element.querySelector('label')).color).toBe('rgb(255, 255, 255)');
  });

  it('removes document listeners when destroyed', () => {
    fixture.destroy();

    document.body.click();
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));

    expect(popoverRef.close).not.toHaveBeenCalled();
  });
});