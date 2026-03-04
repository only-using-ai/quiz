You are to build a new terminal-based app. You are to use the ink library https://github.com/vadimdemedes/ink. This app will be a kahoot replacement. The flow should look like this.

Quiz admin should have options to create the quiz (all command line)
Quiz admin should have the option to share the quiz with a short 7 letter code.
The quiz user should be able to take the quiz and enter it into the command line for this app and join the quiz as a participant.
The quiz admin can start the quiz or advance to the next question. 

Example flow:

[CLI]
> quiz --build

[User builds the quiz]

[Students uses code]
> quiz --join <code>

When the quiz admin selects start, the first question appears on all participants screens. Each picks and answer and when the last person answers, then the results appears on everyones screens.
