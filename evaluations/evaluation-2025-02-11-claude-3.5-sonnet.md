# Component Generation Evaluation Results

## Summary
- **Model**: anthropic/claude-3.5-sonnet
- **Date**: 2025-02-11T23:56:45.423Z
- **Success Rate**: 100.0%
- **Average Generation Time**: 11.9s per component
- **Total Duration**: 119.3s

## Test Cases


### New Component
**Widget URL**: `display/clock/digital/light?params=format:caption,size:integer`
**Parameters**: `{"format":"HH:mm","size":48}`
- **Status**: ✅ Success
- **Duration**: 8.3s


undefined


### New Component
**Widget URL**: `interactive/timer/countdown/light?with_controls=yes&params=duration:integer,size:integer,showControls:boolean`
**Parameters**: `{"duration":180,"size":48,"showControls":true}`
- **Status**: ✅ Success
- **Duration**: 16.3s


undefined


### New Component
**Widget URL**: `input/list/editable/light?with_checkboxes=yes&params=title:caption,items:caption[],enableChecks:boolean`
**Parameters**: `{"title":"Shopping List","items":["Milk","Eggs"],"enableChecks":true}`
- **Status**: ✅ Success
- **Duration**: 9.2s


undefined


### New Component
**Widget URL**: `display/weather/forecast/light?with_daily=yes&params=location:caption,unit:caption,date:string,days:integer`
**Parameters**: `{"location":"current","unit":"celsius","date":"2024-02-06","days":7}`
- **Status**: ✅ Success
- **Duration**: 11.8s


undefined


### New Component
**Widget URL**: `input/note/editable/light?params=title:caption,content:sentence,timestamp:boolean`
**Parameters**: `{"title":"Quick Note","content":"","timestamp":true}`
- **Status**: ✅ Success
- **Duration**: 9.3s


undefined


### New Component
**Widget URL**: `interactive/calculator/basic/light?params=theme:caption,showHistory:boolean,precision:integer`
**Parameters**: `{"theme":"default","showHistory":true,"precision":2}`
- **Status**: ✅ Success
- **Duration**: 27.6s


undefined


### New Component
**Widget URL**: `display/fitness/steps/light?with_progress=yes&params=goal:integer,current:integer,unit:caption`
**Parameters**: `{"goal":10000,"current":0,"unit":"steps"}`
- **Status**: ✅ Success
- **Duration**: 7.6s


undefined


### New Component
**Widget URL**: `input/todo/list/light?with_dates=yes&params=title:caption,items:object[],showDates:boolean`
**Parameters**: `{"title":"Today's Tasks","items":[],"showDates":true}`
- **Status**: ✅ Success
- **Duration**: 10.3s


undefined


### New Component
**Widget URL**: `test/error/render/light?params=triggerError:boolean`
**Parameters**: `{"triggerError":true}`
- **Status**: ✅ Success
- **Duration**: 11.8s


undefined


### New Component
**Widget URL**: `test/error/useErrorBoundaryHook/light?params=throwError:boolean,delay:integer`
**Parameters**: `{"throwError":true,"delay":1000}`
- **Status**: ✅ Success
- **Duration**: 7.1s


undefined
